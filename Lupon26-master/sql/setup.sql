-- SQL Setup for Lupon26 Database
CREATE DATABASE IF NOT EXISTS lupon26_db;
USE lupon26_db;

-- Table for members (Using VARCHAR for ID to avoid 32-bit integer overflow in PHP)
CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    tel VARCHAR(20),
    date_joined DATE,
    expiry_date DATE,
    status ENUM('Active', 'Inactive') DEFAULT 'Active'
);

-- Table for cases
CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR(50) PRIMARY KEY,
    case_no VARCHAR(50) UNIQUE NOT NULL,
    date_filed DATE NOT NULL,
    nature VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending',
    pangkat TEXT,
    docket VARCHAR(100),
    description TEXT,
    relief TEXT,
    -- Complainant info
    comp_last VARCHAR(100),
    comp_first VARCHAR(100),
    comp_mid VARCHAR(100),
    comp_age INT,
    comp_addr TEXT,
    comp_tel VARCHAR(20),
    comp_civil VARCHAR(50),
    -- Respondent info
    resp_last VARCHAR(100),
    resp_first VARCHAR(100),
    resp_mid VARCHAR(100),
    resp_age INT,
    resp_addr TEXT,
    resp_tel VARCHAR(20),
    resp_civil VARCHAR(50)
);

-- Table for hearings
CREATE TABLE IF NOT EXISTS hearings (
    id VARCHAR(50) PRIMARY KEY,
    case_id VARCHAR(50),
    case_no VARCHAR(50),
    hearing_date DATE,
    hearing_time TIME,
    venue VARCHAR(255),
    type VARCHAR(100),
    mediator VARCHAR(255),
    notes TEXT,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Table for settlements
CREATE TABLE IF NOT EXISTS settlements (
    id VARCHAR(50) PRIMARY KEY,
    case_no VARCHAR(50),
    settlement_date DATE,
    type VARCHAR(100),
    terms TEXT,
    captain VARCHAR(255),
    witness VARCHAR(255)
);

-- Table for system configuration
CREATE TABLE IF NOT EXISTS config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    brgy VARCHAR(255),
    muni VARCHAR(255),
    prov VARCHAR(255),
    admin_user VARCHAR(100),
    admin_pass VARCHAR(255)
);

-- Table for invitations
CREATE TABLE IF NOT EXISTS invitations (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50),
    issue_date DATE,
    recipients TEXT,
    address TEXT,
    app_date DATE,
    app_time TIME,
    parties TEXT,
    subject TEXT,
    closing TEXT,
    signatory VARCHAR(255),
    title VARCHAR(255)
);

-- Table for MOVs (Means of Verification)
CREATE TABLE IF NOT EXISTS movs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ref_id VARCHAR(150) NOT NULL,
    ref_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    uploaded_by VARCHAR(100),
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'complete',
    INDEX (ref_id),
    INDEX (ref_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default config
INSERT INTO config (id, brgy, muni, prov, admin_user, admin_pass) 
VALUES (1, 'Barangay Dadiangas West', 'General Santos City', 'South Cotabato', 'admin', 'c66432d603cbe1b37b0959440bad7cde824bffa1cc30d72e1a50fdfdf00cde4a')
ON DUPLICATE KEY UPDATE id=id;
