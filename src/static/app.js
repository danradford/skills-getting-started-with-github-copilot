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

        // Normalize participants to an array with display and email for each
        const rawParticipants = Array.isArray(details.participants) ? details.participants : [];
        const participantsData = rawParticipants.map((p) => {
          let email = null;
          let display = "";

          if (typeof p === "string") {
            email = p;
            display = p;
          } else if (p && typeof p === "object") {
            email = p.email || null;
            if (p.name) display = p.email ? `${p.name} (${p.email})` : p.name;
            else if (p.email) display = p.email;
            else {
              try { display = JSON.stringify(p); } catch { display = String(p); }
            }
          } else {
            display = String(p);
          }

          return { display, email };
        });

        const spotsLeft = (details.max_participants || 0) - participantsData.length;

        // Build participants HTML with a delete button for each participant
        let participantsHtml = "";
        if (participantsData.length > 0) {
          participantsHtml = '<ul class="participants-list">' +
            participantsData.map((pd) => {
              const disp = escapeHtml(pd.display || "");
              const emailAttr = escapeHtml(pd.email || "");
              return `<li class="participant-item"><span class="participant-display">${disp}</span>` +
                `<button class="delete-btn" data-activity="${escapeHtml(name)}" data-email="${emailAttr}" aria-label="Remove participant">✕</button></li>`;
            }).join("") + '</ul>';
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

        // Attach delete handlers for any delete buttons we just added
        const deleteButtons = activityCard.querySelectorAll(".delete-btn");
        deleteButtons.forEach((btn) => {
          btn.addEventListener("click", async (ev) => {
            const activityName = btn.dataset.activity;
            const email = btn.dataset.email;

            if (!activityName || !email) return;

            if (!confirm(`Unregister ${email} from ${activityName}?`)) return;

            try {
              const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: "DELETE" });
              const body = await resp.json();

              if (resp.ok) {
                // Remove the participant element from DOM
                const li = btn.closest(".participant-item");
                if (li) li.remove();

                // Update spots left badge text
                const badge = activityCard.querySelector('.badge');
                if (badge) {
                  // Recompute from remaining list items
                  const remaining = activityCard.querySelectorAll('.participants-list li').length;
                  const max = details.max_participants || 0;
                  badge.textContent = `${max - remaining} spots left`;
                }
              } else {
                alert(body.detail || 'Failed to unregister participant');
              }
            } catch (err) {
              console.error('Error unregistering participant:', err);
              alert('Failed to unregister participant');
            }
          });
        });

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
