from flask import Blueprint, request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from models import db, Admin, Opportunity

bp = Blueprint('main', __name__)

ALLOWED_CATEGORIES = {'technology', 'business', 'design', 'marketing', 'data', 'other'}


# ─── AUTH ────────────────────────────────────────────────────────────────────

@bp.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not full_name or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    if Admin.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists'}), 409

    admin = Admin(full_name=full_name, email=email)
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()
    return jsonify({'message': 'Account created successfully'}), 201


@bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    remember = bool(data.get('remember', False))

    admin = Admin.query.filter_by(email=email).first()
    if not admin or not admin.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    login_user(admin, remember=remember)
    return jsonify({
        'message': 'Login successful',
        'user': {'full_name': admin.full_name, 'email': admin.email}
    }), 200


@bp.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200


@bp.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()

    # Always return success regardless of whether the email exists (prevents enumeration)
    admin = Admin.query.filter_by(email=email).first()
    if admin:
        s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        token = s.dumps(email, salt='password-reset')
        reset_link = f"http://localhost:5000/api/reset-password/{token}"
        print(f"\n{'='*60}")
        print(f"[PASSWORD RESET] Link for {email}:")
        print(f"  {reset_link}")
        print(f"  (expires in 1 hour)")
        print(f"{'='*60}\n")

    return jsonify({'message': 'If this email is registered, a reset link has been logged to the server console'}), 200


@bp.route('/api/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = s.loads(token, salt='password-reset', max_age=3600)
    except SignatureExpired:
        return jsonify({'error': 'Reset link has expired. Please request a new one.'}), 400
    except BadSignature:
        return jsonify({'error': 'Invalid reset link.'}), 400

    if request.method == 'GET':
        return jsonify({'message': 'Token valid', 'email': email}), 200

    data = request.get_json() or {}
    new_password = data.get('password', '')
    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    admin = Admin.query.filter_by(email=email).first()
    if admin:
        admin.set_password(new_password)
        db.session.commit()
    return jsonify({'message': 'Password reset successfully'}), 200


# ─── OPPORTUNITIES ────────────────────────────────────────────────────────────

@bp.route('/api/opportunities', methods=['GET'])
@login_required
def get_opportunities():
    ops = Opportunity.query.filter_by(admin_id=current_user.id).all()
    return jsonify({'status': 'success', 'data': [op.to_dict() for op in ops]}), 200


@bp.route('/api/opportunities', methods=['POST'])
@login_required
def create_opportunity():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    duration = data.get('duration', '').strip()
    start_date = data.get('start_date', '').strip()
    description = data.get('description', '').strip()
    skills = data.get('skills', '').strip()
    category = data.get('category', '').strip().lower()
    future_opportunities = data.get('future_opportunities', '').strip()
    max_applicants = data.get('max_applicants')

    if not all([name, duration, start_date, description, skills, category, future_opportunities]):
        return jsonify({'error': 'All required fields must be filled'}), 400
    if category not in ALLOWED_CATEGORIES:
        return jsonify({'error': f'Invalid category. Allowed: {", ".join(ALLOWED_CATEGORIES)}'}), 400

    op = Opportunity(
        name=name, duration=duration, start_date=start_date,
        description=description, skills=skills, category=category,
        future_opportunities=future_opportunities,
        max_applicants=int(max_applicants) if max_applicants else None,
        admin_id=current_user.id
    )
    db.session.add(op)
    db.session.commit()
    return jsonify({'status': 'success', 'data': op.to_dict()}), 201


@bp.route('/api/opportunities/<int:op_id>', methods=['GET'])
@login_required
def get_opportunity(op_id):
    op = Opportunity.query.filter_by(id=op_id, admin_id=current_user.id).first_or_404()
    return jsonify({'status': 'success', 'data': op.to_dict()}), 200


@bp.route('/api/opportunities/<int:op_id>', methods=['PUT'])
@login_required
def update_opportunity(op_id):
    op = Opportunity.query.filter_by(id=op_id, admin_id=current_user.id).first_or_404()
    data = request.get_json() or {}

    name = data.get('name', '').strip()
    duration = data.get('duration', '').strip()
    start_date = data.get('start_date', '').strip()
    description = data.get('description', '').strip()
    skills = data.get('skills', '').strip()
    category = data.get('category', '').strip().lower()
    future_opportunities = data.get('future_opportunities', '').strip()
    max_applicants = data.get('max_applicants')

    if not all([name, duration, start_date, description, skills, category, future_opportunities]):
        return jsonify({'error': 'All required fields must be filled'}), 400
    if category not in ALLOWED_CATEGORIES:
        return jsonify({'error': f'Invalid category. Allowed: {", ".join(ALLOWED_CATEGORIES)}'}), 400

    op.name = name
    op.duration = duration
    op.start_date = start_date
    op.description = description
    op.skills = skills
    op.category = category
    op.future_opportunities = future_opportunities
    op.max_applicants = int(max_applicants) if max_applicants else None

    db.session.commit()
    return jsonify({'status': 'success', 'data': op.to_dict()}), 200


@bp.route('/api/opportunities/<int:op_id>', methods=['DELETE'])
@login_required
def delete_opportunity(op_id):
    op = Opportunity.query.filter_by(id=op_id, admin_id=current_user.id).first_or_404()
    db.session.delete(op)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Opportunity deleted'}), 200
