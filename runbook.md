# Qatar Foundation Admin Portal - Runbook

This guide explains how to set up, run, and test the backend application, as well as how to inspect the database.

## 1. Project Prerequisites
Ensure your local environment has the following installed:
*   **Python 3.8+**
*   **Git** (if cloning for the first time)
*   **SQLite Viewer** (optional but recommended for inspecting data): [DB Browser for SQLite](https://sqlitebrowser.org/)

**Directory Structure Requirement:**
The backend (`qatar_foundation_admin`) expects the frontend UI to be located at `../Test1/sky` relative to `app.py`. Ensure both folders exist side-by-side.
```text
certifiyme-assessment/
├── Test1/
│   └── sky/               # (Frontend HTML/CSS/JS)
└── qatar_foundation_admin/ # (Backend Flask App)
```

## 2. Setup & Installation

1. Open your terminal (PowerShell or Command Prompt).
2. Navigate into the backend directory:
   ```bash
   cd path\to\certifiyme-assessment\qatar_foundation_admin
   ```
3. Create a Python Virtual Environment:
   ```bash
   python -m venv venv
   ```
4. Activate the Virtual Environment:
   * **Windows:** `venv\Scripts\activate`
   * **Mac/Linux:** `source venv/bin/activate`
5. Install Dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## 3. Running the Application

1. Ensure your virtual environment is active.
2. Start the Flask server by running:
   ```bash
   python app.py
   ```
3. You should see output indicating the server is running on port 5000:
   ```text
    Qatar Foundation Admin Portal
    Running at: http://localhost:5000
    Press Ctrl+C to stop
   ```
4. Open your web browser and go to **`http://localhost:5000`**. You should see the Admin UI.

## 4. How to Verify Features & Data

### A. Testing the Application (Frontend to Backend)
1. **Sign Up:** Go to the signup page, enter details, and submit. If successful, you will be redirected to the login screen.
2. **Login:** Use the credentials you just created. Check the "Remember Me" box to test persistent sessions.
3. **Dashboard / Opportunities:** 
   * Go to "Opportunity Management".
   * Click "Add New Opportunity" and fill out the form. Ensure you select a valid category.
   * Verify the new card appears immediately without refreshing.
   * Edit and Delete the newly created opportunity to verify CRUD capabilities.
4. **Forgot Password:**
   * Go to the Forgot Password screen and enter your registered email.
   * **Check your Terminal/Console:** A mock password reset link will be printed to the server logs (console).
   * Copy the link, paste it into your browser, and follow the steps to reset your password.

### B. Inspecting the Database (SQLite)
The application uses SQLite. The database file is automatically created at `qatar_foundation_admin/instance/admin.db` when you first run the app.

**Method 1: Using DB Browser for SQLite (GUI)**
1. Open *DB Browser for SQLite*.
2. Click "Open Database" and select the `admin.db` file inside the `instance` folder.
3. Go to the **Browse Data** tab.
4. Select the `admin` table to see registered users and verify that passwords are saved as long hash strings.
5. Select the `opportunity` table to verify your created opportunities and ensure `admin_id` correctly maps to the admin who created them.

**Method 2: Using Python Shell (CLI)**
1. In your terminal, ensure you are in the `qatar_foundation_admin` folder and the virtual environment is active.
2. Open the Python interactive shell:
   ```bash
   python
   ```
3. Run the following commands to inspect admins:
   ```python
   from app import app
   from models import db, Admin, Opportunity

   with app.app_context():
       admins = Admin.query.all()
       for admin in admins:
           print(f"ID: {admin.id}, Name: {admin.full_name}, Email: {admin.email}")
           
       ops = Opportunity.query.all()
       print(f"Total Opportunities: {len(ops)}")
   ```

## 5. Troubleshooting Common Issues

* **`ModuleNotFoundError: No module named 'flask'`**
  Your virtual environment isn't activated. Run `venv\Scripts\activate` and try running the app again.
* **Database Errors / `IntegrityError`**
  If the database gets into a weird state during testing, you can simply delete the `instance/admin.db` file and restart the server. `app.py` will automatically recreate a fresh database.
* **400 Bad Request on "Add Opportunity"**
  Ensure you are filling out all required fields. Check that the category exactly matches one of the allowed options in `routes.py` (e.g., `'technology'`, `'business'`, `'data'`).
* **UI Not Loading Correctly / Missing Styles**
  Ensure the `Test1/sky` folder exists in the parent directory as shown in the directory structure above. The Flask app explicitly searches for `../Test1/sky` to load the HTML and CSS.
