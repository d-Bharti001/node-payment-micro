CREATE TABLE IF NOT EXISTS ledger (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    operation ENUM('debit', 'credit') NOT NULL,
    amount BIGINT NOT NULL,
    transaction_timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_ledger (user_id, operation, transaction_id)
);
