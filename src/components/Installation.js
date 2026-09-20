import "./About.css";

export default function Installation() {
  return (
    <main className="about-container">
      <span className="eyebrow">PROFESSIONAL FITMENT</span>
      <h1>Installation services</h1>
      <p>Have your CarKit accessories installed by experienced technicians who know the right fit for your vehicle.</p>
      <div style={{ marginTop: "28px", display: "grid", gap: "18px" }}>
        <section>
          <h2>What we install</h2>
          <p>Car kits, lighting, safety accessories, audio upgrades and other products purchased from CarKit.</p>
        </section>
        <section>
          <h2>How it works</h2>
          <p>Choose your products, place an order, then contact our support team with your order number and vehicle details to arrange an appointment.</p>
        </section>
        <section>
          <h2>Book your appointment</h2>
          <p>Call <strong>+961 81141587</strong> or email <strong>support@carkit.com</strong>. Please have your order number, vehicle make/model and preferred date ready.</p>
        </section>
      </div>
      <a className="hero-btn primary" href="/contact" style={{ display: "inline-block", marginTop: "24px" }}>Contact installation team</a>
    </main>
  );
}
