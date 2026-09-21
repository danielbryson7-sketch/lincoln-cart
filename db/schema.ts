import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const shoppingItems = sqliteTable("shopping_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  checked: integer("checked").notNull().default(0),
  price: real("price"),
  imageUrl: text("image_url"),
  productUrl: text("product_url"),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
