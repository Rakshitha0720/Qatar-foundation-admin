import os
from flask import Flask, send_from_directory, Response
from flask_login import LoginManager
from config import Config
from models import db, Admin

# Absolute path to the cloned UI folder — never modified
UI_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '../Test1/sky'))


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)

    db.init_app(app)

    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(Admin, int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        from flask import jsonify
        return jsonify({'error': 'Authentication required. Please log in.'}), 401

    # Serve admin.html from disk but inject api_connector.js before </body>
    # The original file is NEVER written to — modification happens in memory only
    @app.route('/')
    def index():
        html_path = os.path.join(UI_FOLDER, 'admin.html')
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()
        html = html.replace(
            '</body>',
            '<script src="/api_connector.js"></script>\n</body>'
        )
        return Response(html, mimetype='text/html')

    # Serve the original (untouched) CSS and JS
    @app.route('/admin.css')
    def serve_css():
        return send_from_directory(UI_FOLDER, 'admin.css')

    @app.route('/admin.js')
    def serve_js():
        return send_from_directory(UI_FOLDER, 'admin.js')

    # Serve our connector script from this project folder
    @app.route('/api_connector.js')
    def serve_connector():
        return send_from_directory(os.path.dirname(__file__), 'api_connector.js')

    from routes import bp
    app.register_blueprint(bp)

    with app.app_context():
        db.create_all()

    return app


app = create_app()

if __name__ == '__main__':
    print("\n Qatar Foundation Admin Portal")
    print(" Running at: http://localhost:5000")
    print(" Press Ctrl+C to stop\n")
    app.run(debug=True, port=5000)
