import { RowDataPacket } from "mysql2";

export interface IOutboxRow extends RowDataPacket {
    id: number;

    topic: string;
    message_key: string;
    payload: unknown;

    created_at: Date;
    published_at: Date | null;
}
