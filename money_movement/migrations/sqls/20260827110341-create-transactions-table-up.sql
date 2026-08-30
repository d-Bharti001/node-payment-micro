CREATE TABLE IF NOT EXISTS transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    idempotency_key varchar(255) NOT NULL,
    from_user_id VARCHAR(255) NOT NULL,
    to_user_id VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    tx_status ENUM('pending', 'completed', 'reverted') NOT NULL,

    INDEX(from_user_id),
    INDEX(to_user_id),
    CONSTRAINT uq_from_user_idempotency_key UNIQUE (from_user_id, idempotency_key)
);
