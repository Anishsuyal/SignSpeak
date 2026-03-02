import LeftPanel from "./LeftPanel";

export default function AuthLayout({ children }) {
  return (
    <div className="auth-container">
      <LeftPanel />

      <div className="right-panel">
        {children}
      </div>
    </div>
  );
}