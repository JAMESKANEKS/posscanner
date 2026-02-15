import { useEffect, useState } from "react";
import { ref, push, get, child, update, remove } from "firebase/database";
import { db } from "../firebase";
import Scanner from "./scanner";

export default function Product() {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [barcode, setBarcode] = useState("");

  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  // Track which product barcode image is visible
  const [visibleBarcodeId, setVisibleBarcodeId] = useState(null);

  const productsRef = ref(db, "products");

  // 🔄 Fetch products
  const fetchProducts = async () => {
    const snapshot = await get(child(ref(db), "products"));
    const data = snapshot.val() || {};

    const list = Object.keys(data).map((key) => ({
      id: key,
      ...data[key],
    }));

    setProducts(list);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 💾 Save or Update Product
  const saveProduct = async (e) => {
    e.preventDefault();

    if (!title || !price || !stock) {
      alert("Please fill required fields");
      return;
    }

    const productData = {
      title,
      details,
      price: Number(price),
      category,
      stock: Number(stock),
      barcode,
      available: true,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingId) {
        await update(ref(db, `products/${editingId}`), productData);
        alert("Product updated!");
      } else {
        await push(productsRef, {
          ...productData,
          createdAt: new Date().toISOString(),
        });
        alert("Product added!");
      }

      resetForm();
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Error saving product");
    }
  };

  // 🧹 Reset form
  const resetForm = () => {
    setTitle("");
    setDetails("");
    setPrice("");
    setCategory("");
    setStock("");
    setBarcode("");
    setEditingId(null);
  };

  // ✏ Edit product
  const editProduct = (p) => {
    setEditingId(p.id);
    setTitle(p.title);
    setDetails(p.details);
    setPrice(p.price);
    setCategory(p.category);
    setStock(p.stock);
    setBarcode(p.barcode);
  };

  // ❌ Delete product
  const deleteProduct = async (id) => {
    if (window.confirm("Delete this product?")) {
      await remove(ref(db, `products/${id}`));
      fetchProducts();
    }
  };

  // ⚡ Generate barcode
  const generateBarcode = () => {
    const randomBarcode =
      Math.floor(100000000000 + Math.random() * 900000000000);
    setBarcode(randomBarcode.toString());
  };

  // 🖼 Download barcode image
  const downloadBarcode = (barcode) => {
    const url = `https://barcode.tec-it.com/barcode.ashx?data=${barcode}&code=Code128`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${barcode}.png`;
    link.click();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Product Manager</h1>

      {/* 📝 FORM */}
      <form onSubmit={saveProduct}>
        <input
          type="text"
          placeholder="Product Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <br /><br />

        <textarea
          placeholder="Product Details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />

        <br /><br />

        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        <br /><br />

        <input
          type="text"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <br /><br />

        <input
          type="number"
          placeholder="Stock"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          required
        />

        <br /><br />

        {/* 🔥 BARCODE */}
        <h3>Barcode</h3>

        <input
          type="text"
          placeholder="Scan or generate barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
        />

        <br /><br />

        <button type="button" onClick={() => setShowScanner(true)}>
          📱 Scan Barcode
        </button>

        <button type="button" onClick={generateBarcode}>
          ⚡ Generate Barcode
        </button>

        <br /><br />

        <button type="submit">
          {editingId ? "Update Product" : "Save Product"}
        </button>
      </form>

      {/* 📱 Scanner */}
      {showScanner && (
        <Scanner
          onScanSuccess={(code) => {
            setBarcode(code);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      <hr />

      {/* 🧾 PRODUCT CARDS */}
      <h2>All Products</h2>

      <div style={{ display: "grid", gap: "15px" }}>
        {products.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              borderRadius: "8px",
            }}
          >
            <h3>{p.title}</h3>
            <p>{p.details}</p>

            <p><b>Price:</b> ₱{p.price}</p>
            <p><b>Category:</b> {p.category}</p>
            <p><b>Stock:</b> {p.stock}</p>

            {/* ⭐ BARCODE NUMBER */}
            <p><b>Barcode:</b> {p.barcode || "None"}</p>

            {/* 👁 VIEW / HIDE BARCODE IMAGE */}
            {p.barcode && (
              <div>
                <button
                  onClick={() =>
                    setVisibleBarcodeId(
                      visibleBarcodeId === p.id ? null : p.id
                    )
                  }
                >
                  {visibleBarcodeId === p.id ? "Hide Barcode" : "View Barcode"}
                </button>

                {visibleBarcodeId === p.id && (
                  <div style={{ marginTop: "10px" }}>
                    <img
                      src={`https://barcode.tec-it.com/barcode.ashx?data=${p.barcode}&code=Code128`}
                      alt="barcode"
                      style={{ width: "200px", cursor: "pointer" }}
                      onClick={() => downloadBarcode(p.barcode)}
                      title="Click to download"
                    />
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: "10px" }}>
              <button onClick={() => editProduct(p)}>✏ Edit</button>
              <button
                onClick={() => deleteProduct(p.id)}
                style={{ marginLeft: "10px" }}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
