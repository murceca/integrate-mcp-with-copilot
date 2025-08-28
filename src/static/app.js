document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Authentication elements
  const loginSection = document.getElementById("login-section");
  const userInfo = document.getElementById("user-info");
  const usernameDisplay = document.getElementById("username-display");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const closeModal = document.querySelector(".close");
  const authRequiredMessage = document.getElementById("auth-required-message");
  
  // Authentication state
  let currentUser = null;
  let authToken = localStorage.getItem("authToken");

  // Initialize authentication state
  async function initAuth() {
    if (authToken) {
      const userInfo = await getCurrentUser();
      if (userInfo && userInfo.authenticated) {
        currentUser = userInfo.username;
        showLoggedInState();
      } else {
        // Token invalid, clear it
        localStorage.removeItem("authToken");
        authToken = null;
        showLoggedOutState();
      }
    } else {
      showLoggedOutState();
    }
  }

  // Get current user info
  async function getCurrentUser() {
    try {
      const response = await fetch("/me", {
        headers: authToken ? { "Authorization": `Bearer ${authToken}` } : {}
      });
      return await response.json();
    } catch (error) {
      console.error("Error getting user info:", error);
      return { authenticated: false };
    }
  }

  // Show logged in state
  function showLoggedInState() {
    loginSection.classList.add("hidden");
    userInfo.classList.remove("hidden");
    usernameDisplay.textContent = currentUser;
    signupForm.classList.remove("hidden");
    authRequiredMessage.classList.add("hidden");
  }

  // Show logged out state
  function showLoggedOutState() {
    loginSection.classList.remove("hidden");
    userInfo.classList.add("hidden");
    signupForm.classList.add("hidden");
    authRequiredMessage.classList.remove("hidden");
    currentUser = null;
  }

  // Login modal handlers
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
  });

  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  // Handle login
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    
    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
      });
      
      const result = await response.json();
      
      if (response.ok) {
        authToken = result.access_token;
        currentUser = result.username;
        localStorage.setItem("authToken", authToken);
        
        loginMessage.textContent = "Login successful!";
        loginMessage.className = "success";
        loginMessage.classList.remove("hidden");
        
        setTimeout(() => {
          loginModal.classList.add("hidden");
          loginForm.reset();
          loginMessage.classList.add("hidden");
          showLoggedInState();
        }, 1000);
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    authToken = null;
    showLoggedOutState();
    fetchActivities(); // Refresh to hide delete buttons
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons only for authenticated users
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    const deleteButton = currentUser 
                      ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                      : '';
                    return `<li><span class="participant-email">${email}</span>${deleteButton}</li>`;
                  })
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (only if user is authenticated)
      if (currentUser) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: authToken ? { "Authorization": `Bearer ${authToken}` } : {}
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
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
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: authToken ? { "Authorization": `Bearer ${authToken}` } : {}
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
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
  initAuth().then(() => {
    fetchActivities();
  });
});
