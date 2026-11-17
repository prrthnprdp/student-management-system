<?php
/**
 * config/database.php
 * -------------------------------------------------------------
 * The ONLY place where database settings live.
 * Default XAMPP values: host=localhost, user=root, password=(empty).
 * Change them here if your MySQL setup is different.
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'student_management');
define('DB_USER', 'root');
define('DB_PASS', '');          // empty by default in XAMPP

// Semester used for the "Current Semester" dashboard card
// when no semester filter is selected.
define('CURRENT_SEMESTER', '5');

/**
 * Create and return a PDO connection.
 * Throws a PDOException if the connection fails
 * (the API file catches it and returns a JSON error).
 */
function getConnection(): PDO
{
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';

    return new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // throw errors
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // rows as arrays
        PDO::ATTR_EMULATE_PREPARES   => false,                    // real prepared statements
    ]);
}
