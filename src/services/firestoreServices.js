import { db } from "../firebase";
import { 
  ref, push, get, update, child 
} from "firebase/database";

// Add a product
export const addProduct = async (product) => {
  await push(ref(db, "products"), product);
};

// Fetch all products
export const getAllProducts = async () => {
  const snapshot = await get(child(ref(db), "products"));
  const products = snapshot.val() || {};
  return Object.keys(products).map(key => ({ id: key, ...products[key] }));
};

// Update availability
export const updateProductStatus = async (id, status) => {
  await update(ref(db, `products/${id}`), { available: status });
};
