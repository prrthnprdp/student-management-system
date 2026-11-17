<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "PHP works<br>";

try {
    $pdo = new PDO('mysql:host=127.0.0.1;dbname=student_management', 'root', '');
    echo "Database connected";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}