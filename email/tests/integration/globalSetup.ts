import { GenericContainer, Wait } from "testcontainers";

// Starts one real Mailpit SMTP server (same image as the k8s manifests) for the whole run.
export default async function setup() {
    const container = await new GenericContainer("axllent/mailpit:v1.31.2")
        .withExposedPorts(1025, 8025)
        .withWaitStrategy(Wait.forHttp("/livez", 8025))
        .start();

    process.env.SMTP_HOST = container.getHost();
    process.env.SMTP_PORT = String(container.getMappedPort(1025));
    process.env.MAILPIT_API_URL = `http://${container.getHost()}:${container.getMappedPort(8025)}`;

    return async () => {
        await container.stop();
    };
}
