from app.db.database import engine
from sqlalchemy import text

def migrate():
    print("Starting migration: Adding 'campus' column to 'prediction_runs'...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE prediction_runs ADD COLUMN campus VARCHAR;"))
            conn.commit()
            print("Successfully added 'campus' column.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("Column 'campus' already exists, skipping.")
            else:
                print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
