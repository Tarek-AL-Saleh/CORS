from app.db.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("Checking constraints...")
    # Find constraint name
    res = conn.execute(text("SELECT conname FROM pg_constraint WHERE conrelid = 'course_offerings'::regclass AND contype = 'f';"))
    names = [r[0] for r in res]
    for name in names:
        print(f"Dropping constraint: {name}")
        conn.execute(text(f"ALTER TABLE course_offerings DROP CONSTRAINT {name};"))
    conn.commit()
    print("All foreign key constraints dropped from course_offerings.")
