export default function NotFound() {
  return (
    <div className="container pagestub">
      <h1>404 — off the map</h1>
      <p className="muted">This address doesn't exist in the stack.</p>
      <p>
        <a className="btn btn-primary" href="#/">
          ← Back to the map
        </a>
      </p>
    </div>
  );
}
