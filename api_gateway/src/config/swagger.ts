import path from "path";
import swaggerJsdoc from "swagger-jsdoc";

// tsx runs the .ts sources directly in dev; the compiled build serves .js
// from build/src instead. Matching the extension of this file keeps the glob
// correct in both cases without hardcoding one or the other.
const apiFileExt = path.extname(__filename);

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Payment Microservices App API Docs",
            version: "1.0.0",
            description: "API documentation for payment microservices app api gateway service",
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                Error: {
                    type: "object",
                    properties: {
                        error: {
                            type: "string",
                            example: "something went wrong",
                        },
                    },
                },
            },
        },
    },
    apis: [
        path.join(__dirname, `../routes/*${apiFileExt}`),
        path.join(__dirname, `../controllers/*${apiFileExt}`),
    ],
};

export const swaggerSpec = swaggerJsdoc(options);
