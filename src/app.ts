import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

dotenv.config();

const app: Application = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_PREFIX = process.env.API_PREFIX || "/api";

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "This is EmpCon API" });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

export default app;
