# Qatar Foundation Admin Portal - Backend Assignment Submission

**Submitted by:** Rakshitha S 
**Assignment:** Certify Me - Intern Task (Backend Development)

## 📌 Overview
This repository contains my submission for the Qatar Foundation Admin Portal backend assignment. The objective of this project was to build a secure, fully functional backend using Python and Flask to support an existing Admin Portal UI without altering the provided frontend code.

All API routes have been built to interface seamlessly with the frontend's asynchronous requests, managing state and data storage dynamically.

## 🚀 Features Implemented

### Task 1: Authentication & User Management
- **Admin Sign Up:** Secure account creation with Werkzeug password hashing and duplicate email checks.
- **Admin Login:** Authentication system using `Flask-Login` with session management and a "Remember Me" persistent cookie functionality.
- **Forgot Password:** Secure, token-based password reset link generation (logged to the server console) with a strict 1-hour expiration.

### Task 2: Opportunity Management (CRUD)
- **View Opportunities:** Fetches and displays only the opportunities created by the currently logged-in admin, ensuring strict data isolation.
- **Add Opportunity:** Robust backend validation for required fields and categories, linking the newly created opportunity securely to the admin's session ID.
- **Edit & Delete:** Secured endpoints that verify the user owns the opportunity before committing any updates or deletions to the database.
- **Data Persistence:** All opportunities and admin profiles are permanently saved in an SQLite database (`instance/admin.db`).

## 🛠️ Tech Stack
- **Language:** Python 3
- **Framework:** Flask
- **Database:** SQLite & Flask-SQLAlchemy
- **Authentication:** Flask-Login, Werkzeug Security, itsdangerous (for token generation)

## 📖 Running the Application
I have provided a detailed, step-by-step guide on how to set up the environment, run the server, and verify the backend data in the included Runbook.

👉 **[Click here to view the Runbook](runbook.md)**

## 📋 Evaluation Notes
- The backend API accurately responds to all frontend XHR/fetch requests via the `api_connector.js` script.
- The `ALLOWED_CATEGORIES` list enforces strict data integrity for the Opportunity creation logic.
- Session tokens and cross-site protections are enforced implicitly via Flask and Flask-Login configurations.

Thank you for reviewing my submission!
