export interface PaymentsTopicMessageValue {
    transactionId: number;
    fromUserId: string;
    toUserId: string;
    amount: bigint;
    createdAt: Date;
}
