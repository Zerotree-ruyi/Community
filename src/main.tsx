
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { enableProtection } from "./app/utils/protection";

  // 防 F12 / 右键 / 调试器(生产构建才默认启用,开发模式用 ?protect=1 强制开)
  enableProtection();

  createRoot(document.getElementById("root")!).render(<App />);
  