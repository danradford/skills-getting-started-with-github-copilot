document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // simple HTML-escape helper to avoid XSS when inserting participant names/emails
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // DEBUG: inspect the payload so you can see the participants structure in the console
      console.debug("Fetched activities:", activities);

      // Clear loading message / previous content
      activitiesList.innerHTML = "";

      // Reset select options (keep the placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Create a grid container for nicer layout
      const grid = document.createElement("div");
      grid.className = "activities-grid";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        // Normalize participants to an array of display strings
        const rawParticipants = Array.isArray(details.participants) ? details.participants : [];
        const participants = rawParticipants.map((p) => {
          if (typeof p === "string") return p;
          if (p && typeof p === "object") {
            // prefer name, fall back to email or stringify the object
            if (p.name) return p.email ? `${p.name} (${p.email})` : p.name;
            if (p.email) return p.email;
            try { return JSON.stringify(p); } catch { return String(p); }
          }
          return String(p);
        });

        const spotsLeft = (details.max_participants || 0) - participants.length;

        // Build participants HTML
        let participantsHtml = "";
        if (participants.length > 0) {
          participantsHtml =
            '<ul class="participants-list">' +
            participants.map((p) => `<li>${escapeHtml(p)}</li>`).join("") +
            "</ul>";
        } else {
          participantsHtml = '<p class="no-participants">No participants yet — be the first!</p>';
        }

        activityCard.innerHTML = `
          <div class="activity-card-head">
            <h4 class="activity-title">${escapeHtml(name)}</h4>
            <span class="badge">${spotsLeft} spots left</span>
          </div>
          <p class="activity-desc">${escapeHtml(details.description)}</p>
          <p class="activity-schedule"><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>

          <div class="participants-section">
            <h5>Participants</h5>
            ${participantsHtml}
          </div>
        `;

        grid.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      activitiesList.appendChild(grid);
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities so participants and availability update immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
