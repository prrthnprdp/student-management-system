<?php
/**
 * api/students.php  -  REST API for student records
 * -------------------------------------------------------------
 * GET    students.php                -> list students (optional ?search=&department=&semester=)
 * GET    students.php?id=1           -> one student
 * GET    students.php?stats=1        -> dashboard numbers (optional &semester=)
 * POST   students.php                -> add student   (JSON body)
 * PUT    students.php?id=1           -> update student (JSON body)
 * DELETE students.php?id=1           -> delete student
 *
 * Every response is JSON: { "success": true|false, "message": "...", ... }
 */

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=UTF-8');

/** Send a JSON response with an HTTP status code and stop. */
function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Read and decode the JSON request body (used by POST and PUT). */
function readJsonBody(): array
{
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        respond(400, ['success' => false, 'message' => 'Invalid or missing JSON body']);
    }
    return $data;
}

/**
 * Validate and clean student data.
 * Returns [cleanData, errors]. "errors" is empty when everything is valid.
 */
function validateStudent(array $in): array
{
    $departments = ['CSE', 'ECE', 'EEE', 'IT', 'Mechanical', 'Civil'];
    $genders     = ['Male', 'Female', 'Other'];

    $d = [];
    foreach (['student_id', 'name', 'email', 'phone', 'department', 'semester', 'gender', 'dob', 'address'] as $f) {
        $d[$f] = isset($in[$f]) ? trim((string)$in[$f]) : '';
    }
    $d['phone'] = preg_replace('/[\s\-]/', '', $d['phone']);   // "98470 12345" -> "9847012345"

    $e = [];

    // Required fields
    $labels = [
        'student_id' => 'Student ID', 'name' => 'Full name', 'email' => 'Email', 'phone' => 'Phone',
        'department' => 'Department', 'semester' => 'Semester', 'gender' => 'Gender',
        'dob' => 'Date of birth', 'address' => 'Address',
    ];
    foreach ($labels as $field => $label) {
        if ($d[$field] === '') {
            $e[$field] = "$label is required";
        }
    }

    // Format checks (only if the field is not already marked missing)
    if (!isset($e['student_id']) && !preg_match('/^[A-Za-z0-9\-]{3,20}$/', $d['student_id'])) {
        $e['student_id'] = 'Use 3-20 letters, numbers or hyphens';
    }
    if (!isset($e['name']) && !preg_match('/^[\p{L}][\p{L} .\'\-]{1,99}$/u', $d['name'])) {
        $e['name'] = 'Enter a valid name (letters and spaces only)';
    }
    if (!isset($e['email']) && (!filter_var($d['email'], FILTER_VALIDATE_EMAIL) || strlen($d['email']) > 100)) {
        $e['email'] = 'Enter a valid email address';
    }
    if (!isset($e['phone']) && !preg_match('/^\+?[0-9]{10,13}$/', $d['phone'])) {
        $e['phone'] = 'Enter a valid phone number (10-13 digits)';
    }
    if (!isset($e['department']) && !in_array($d['department'], $departments, true)) {
        $e['department'] = 'Choose a valid department';
    }
    if (!isset($e['semester']) && !preg_match('/^[1-8]$/', $d['semester'])) {
        $e['semester'] = 'Semester must be between 1 and 8';
    }
    if (!isset($e['gender']) && !in_array($d['gender'], $genders, true)) {
        $e['gender'] = 'Choose a valid gender';
    }
    if (!isset($e['dob'])) {
        $date = DateTime::createFromFormat('Y-m-d', $d['dob']);
        if (!$date || $date->format('Y-m-d') !== $d['dob']) {
            $e['dob'] = 'Enter a valid date';
        } elseif ($date > new DateTime('today')) {
            $e['dob'] = 'Date of birth cannot be in the future';
        }
    }

    return [$d, $e];
}

// ---------------------------------------------------------------
// Connect to the database
// ---------------------------------------------------------------
try {
    $pdo = getConnection();
} catch (PDOException $ex) {
    respond(500, [
        'success' => false,
        'message' => 'Database connection failed. Check that MySQL is running and config/database.php is correct.',
    ]);
}

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;

try {
    switch ($method) {

        // ============================ READ ============================
        case 'GET':

            // ---- Dashboard statistics ----
            if (isset($_GET['stats'])) {
                $sem = (isset($_GET['semester']) && $_GET['semester'] !== '') ? $_GET['semester'] : CURRENT_SEMESTER;

                $stmt = $pdo->prepare(
                    "SELECT COUNT(*) AS total,
                            COALESCE(SUM(department = 'CSE'), 0) AS cse,
                            COALESCE(SUM(department = 'ECE'), 0) AS ece,
                            COALESCE(SUM(semester = :sem), 0)    AS semester_count
                     FROM students"
                );
                $stmt->execute([':sem' => $sem]);
                $row = $stmt->fetch();

                respond(200, ['success' => true, 'data' => [
                    'total'    => (int)$row['total'],
                    'cse'      => (int)$row['cse'],
                    'ece'      => (int)$row['ece'],
                    'semester' => (string)$sem,
                    'semester_count' => (int)$row['semester_count'],
                ]]);
            }

            // ---- One student ----
            if ($id > 0) {
                $stmt = $pdo->prepare('SELECT * FROM students WHERE id = :id');
                $stmt->execute([':id' => $id]);
                $student = $stmt->fetch();

                if (!$student) {
                    respond(404, ['success' => false, 'message' => 'Student not found']);
                }
                respond(200, ['success' => true, 'data' => $student]);
            }

            // ---- List (with optional search + filters) ----
            $where  = [];
            $params = [];

            $search = trim($_GET['search'] ?? '');
            if ($search !== '') {
                // With real prepared statements each placeholder name can be used only once
                $where[] = '(student_id LIKE :s1 OR name LIKE :s2 OR email LIKE :s3)';
                $params[':s1'] = $params[':s2'] = $params[':s3'] = '%' . $search . '%';
            }
            if (!empty($_GET['department'])) {
                $where[] = 'department = :dept';
                $params[':dept'] = $_GET['department'];
            }
            if (!empty($_GET['semester'])) {
                $where[] = 'semester = :sem';
                $params[':sem'] = $_GET['semester'];
            }

            $sql = 'SELECT * FROM students';
            if ($where) {
                $sql .= ' WHERE ' . implode(' AND ', $where);
            }
            $sql .= ' ORDER BY id DESC';

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $students = $stmt->fetchAll();

            respond(200, ['success' => true, 'count' => count($students), 'data' => $students]);
            break;

        // ============================ CREATE ============================
        case 'POST':
            [$data, $errors] = validateStudent(readJsonBody());
            if ($errors) {
                respond(422, ['success' => false, 'message' => 'Please fix the highlighted fields', 'errors' => $errors]);
            }

            // Duplicate Student ID?
            $stmt = $pdo->prepare('SELECT id FROM students WHERE student_id = :sid');
            $stmt->execute([':sid' => $data['student_id']]);
            if ($stmt->fetch()) {
                respond(409, [
                    'success' => false,
                    'message' => 'Student ID already exists',
                    'errors'  => ['student_id' => 'Student ID already exists'],
                ]);
            }

            $stmt = $pdo->prepare(
                'INSERT INTO students (student_id, name, email, phone, department, semester, gender, dob, address)
                 VALUES (:student_id, :name, :email, :phone, :department, :semester, :gender, :dob, :address)'
            );
            $stmt->execute($data);

            respond(201, ['success' => true, 'message' => 'Student added successfully', 'id' => (int)$pdo->lastInsertId()]);
            break;

        // ============================ UPDATE ============================
        case 'PUT':
            if ($id <= 0) {
                respond(400, ['success' => false, 'message' => 'Student id is required']);
            }

            $stmt = $pdo->prepare('SELECT id FROM students WHERE id = :id');
            $stmt->execute([':id' => $id]);
            if (!$stmt->fetch()) {
                respond(404, ['success' => false, 'message' => 'Student not found']);
            }

            [$data, $errors] = validateStudent(readJsonBody());
            if ($errors) {
                respond(422, ['success' => false, 'message' => 'Please fix the highlighted fields', 'errors' => $errors]);
            }

            // Duplicate Student ID used by a DIFFERENT record?
            $stmt = $pdo->prepare('SELECT id FROM students WHERE student_id = :sid AND id <> :id');
            $stmt->execute([':sid' => $data['student_id'], ':id' => $id]);
            if ($stmt->fetch()) {
                respond(409, [
                    'success' => false,
                    'message' => 'Student ID already exists',
                    'errors'  => ['student_id' => 'Student ID already exists'],
                ]);
            }

            $data['id'] = $id;
            $stmt = $pdo->prepare(
                'UPDATE students
                 SET student_id = :student_id, name = :name, email = :email, phone = :phone,
                     department = :department, semester = :semester, gender = :gender,
                     dob = :dob, address = :address
                 WHERE id = :id'
            );
            $stmt->execute($data);

            respond(200, ['success' => true, 'message' => 'Student updated successfully']);
            break;

        // ============================ DELETE ============================
        case 'DELETE':
            if ($id <= 0) {
                respond(400, ['success' => false, 'message' => 'Student id is required']);
            }

            $stmt = $pdo->prepare('DELETE FROM students WHERE id = :id');
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() === 0) {
                respond(404, ['success' => false, 'message' => 'Student not found']);
            }
            respond(200, ['success' => true, 'message' => 'Student deleted successfully']);
            break;

        default:
            header('Allow: GET, POST, PUT, DELETE');
            respond(405, ['success' => false, 'message' => 'Method not allowed']);
    }
} catch (PDOException $ex) {
    // Safety net: a unique-key clash that slipped past our own check
    if ($ex->getCode() === '23000') {
        respond(409, ['success' => false, 'message' => 'Student ID already exists',
                      'errors' => ['student_id' => 'Student ID already exists']]);
    }
    respond(500, ['success' => false, 'message' => 'Database error. Please try again.']);
}
