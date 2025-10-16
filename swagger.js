import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Quanvaulte API",
      version: "1.0.0",
      description: "API documentation for Quanvault project",
    },
    servers: [
      {
        url: "http://localhost:5000", // adjust for prod
      },
      {
        url: "https://quanvaulte-51ebs8avn-clement-idemudos-projects.vercel.app", // adjust for prod
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"], // adjust path to where your routes are
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };
