import "./About.css";
import "./Contact.css";

export default function Contact() {
  return (
    <div className="about-container">
      <h1>Contact Us</h1>
      <p>Have questions about accessories, fitments, or your orders? We are here to help!</p>
      <div style={{ marginTop: "20px", lineHeight: "1.8" }}>
        <p>📧 <strong>Email:</strong> support@carkit.com</p>
        <p>📞 <strong>Phone:</strong> +961 81141587</p>
        <p>📍 <strong>Address:</strong> 123 CarKit Ave, Suite 400, Auto City</p>
      </div>
    </div>
  );
}

