import { GenericContainer, Wait } from "testcontainers";
import { createTopic, startKafka } from "../support/kafka";

// Starts one real Mailpit SMTP server (same image as the k8s manifests) for the whole run.
export default async function setup() {
    const stopKafka = await startKafka();
    await createTopic("payments", 3);

    const mailpitContainer = await new GenericContainer("axllent/mailpit:v1.31.2")
        .withExposedPorts(1025, 8025)
        .withWaitStrategy(Wait.forHttp("/livez", 8025))
        .start();

    process.env.SMTP_HOST = mailpitContainer.getHost();
    process.env.SMTP_PORT = String(mailpitContainer.getMappedPort(1025));
    process.env.MAILPIT_API_URL = `http://${mailpitContainer.getHost()}:${mailpitContainer.getMappedPort(8025)}`;

    return async () => {
        await stopKafka();
        await mailpitContainer.stop();
    };
}
