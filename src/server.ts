import dotenv from "dotenv";
import app from "./app";

dotenv.config();

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
