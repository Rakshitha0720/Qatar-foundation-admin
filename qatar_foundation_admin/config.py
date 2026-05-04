import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'qf-admin-secret-key-change-in-production')
    
    if os.environ.get('VERCEL'):
        fallback_db = 'sqlite:////tmp/admin.db'
    else:
        fallback_db = 'sqlite:///admin.db'
        
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', fallback_db)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    REMEMBER_COOKIE_DURATION = 60 * 60 * 24 * 30  # 30 days in seconds
    SESSION_COOKIE_SAMESITE = 'Lax'
