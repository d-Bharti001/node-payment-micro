import type { RowDataPacket } from "mysql2";

export interface IUserRow extends RowDataPacket {
    seq_id: number;
    user_id: string;
    password_hashed: string;
    created_at: Date;
}
