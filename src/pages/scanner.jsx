import { useEffect, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { get, ref, child } from "firebase/database";
import { db } from "../firebase";

export default function Scanner({ onProductFound, onClose }) {
  const [errorMsg, setErrorMsg] = useState("");
  const [isScanning, setIsScanning] = useState(true);
  const [lastScanned, setLastScanned] = useState("");
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("scanner-container");

    const config = {
      fps: 10,
      qrbox: { width: 300, height: 100 },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          if (!decodedText) return;
          
          // Prevent duplicate scans
          if (decodedText === lastScanned) return;
          
          setLastScanned(decodedText);
          setScanCount(prev => prev + 1);
          setIsScanning(false);

          try {
            // 🔎 Look up product by barcode
            const snapshot = await get(child(ref(db), "products"));
            const productsData = snapshot.val() || {};
            const productList = Object.keys(productsData).map((key) => ({
              id: key,
              ...productsData[key],
            }));

            const product = productList.find((p) => p.barcode === decodedText);

            if (product) {
              onProductFound(product); // send product to parent
            } else {
              setErrorMsg(`Product not found for barcode: ${decodedText}`);
              // Auto-retry after 2 seconds
              setTimeout(() => {
                setErrorMsg("");
                setIsScanning(true);
                setLastScanned("");
              }, 2000);
            }
          } catch (err) {
            console.error("Error fetching products:", err);
            setErrorMsg("Error fetching product data. Retrying...");
            // Auto-retry after 2 seconds
            setTimeout(() => {
              setErrorMsg("");
              setIsScanning(true);
              setLastScanned("");
            }, 2000);
          }
        },
        (errMsg) => {
          // Only show error messages, not continuous scanning messages
          if (errMsg && !errMsg.includes("No barcode or QR code detected")) {
            setErrorMsg(errMsg);
          }
        }
      )
      .catch((err) => {
        console.error("Scanner failed to start:", err);
        setErrorMsg("Camera access denied or not supported");
      });

    return () => {
      html5QrCode.stop().catch(() => {});
      html5QrCode.clear();
    };
  }, [onProductFound, onClose, lastScanned]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        id="scanner-container"
        style={{
          width: "90%",
          maxWidth: "400px",
          border: isScanning ? "2px solid #00ff00" : "2px solid #ff9900",
          borderRadius: "10px",
          overflow: "hidden",
          position: "relative",
        }}
      />
      <div style={{ color: "white", marginTop: "10px", textAlign: "center" }}>
        <p style={{ margin: "5px 0" }}>
          {isScanning ? "🟢 Scanning..." : "🟡 Processing..."}
        </p>
        <p style={{ margin: "5px 0", fontSize: "14px" }}>
          {errorMsg || "Point your camera at a barcode"}
        </p>
        {lastScanned && (
          <p style={{ margin: "5px 0", fontSize: "12px", color: "#ccc" }}>
            Last scanned: {lastScanned}
          </p>
        )}
        {scanCount > 0 && (
          <p style={{ margin: "5px 0", fontSize: "12px", color: "#ccc" }}>
            Scans attempted: {scanCount}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        style={{
          marginTop: "15px",
          padding: "10px 20px",
          borderRadius: "5px",
          border: "none",
          backgroundColor: "#3498db",
          color: "white",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Close Scanner
      </button>
    </div>
  );
}
