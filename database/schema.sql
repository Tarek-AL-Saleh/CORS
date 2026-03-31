-- 1. Courses Table
CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(10) UNIQUE NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    credits INT DEFAULT 3,
    course_level INT,
    is_lab BOOLEAN DEFAULT FALSE,
    is_spring_only BOOLEAN DEFAULT FALSE,
    is_fall_only BOOLEAN DEFAULT FALSE
) ENGINE = InnoDB;

-- 2. Prerequisites Table
CREATE TABLE prerequisites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT,
    prereq_id INT,
    logic_type VARCHAR(5) DEFAULT 'AND',
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (prereq_id) REFERENCES courses(id)
) ENGINE = InnoDB;

-- 3. Terms Table
CREATE TABLE terms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    term_code VARCHAR(10) UNIQUE,
    term_name VARCHAR(20)
) ENGINE = InnoDB;

-- 4. Doctors/Faculty Table
CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    max_load INT DEFAULT 4
) ENGINE = InnoDB;

-- 5. Rooms Table
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10) NOT NULL,
    capacity INT NOT NULL
) ENGINE = InnoDB;

-- 6. Section Offerings (The Hybrid Data Table)
CREATE TABLE section_offerings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    term_id INT,
    course_id INT,
    doctor_id INT NULL,
    room_id INT NULL,
    section_number INT,
    enrollment_count INT DEFAULT 0,
    predicted_enrollment INT DEFAULT 0,
    is_ai_recommended BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (term_id) REFERENCES terms(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE = InnoDB;