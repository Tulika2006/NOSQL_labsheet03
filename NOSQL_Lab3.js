// MongoDB Practical Solutions — 15 Systems
// Detailed, sectioned examples are in the accompanying PDF.


// 1. Student Activity Tracking System

// Design: Store one document per student. Arrays suit enrolled courses, skills, and recent activities; attendance can be embedded when the record is modest in size.


db.students.insertOne({
  _id: 1001, name: "Asha Rao", department: "CSE", year: 2,
  enrolledCourses: ["DBMS", "Java", "Networks"],
  attendance: [{ course: "DBMS", present: 18, total: 20 }],
  skills: ["MongoDB", "Python", "HTML"],
  recentActivities: [
    { type: "quiz", course: "DBMS", score: 92, at: ISODate("2026-10-10") },
    { type: "assignment", course: "Java", status: "submitted", at: ISODate("2026-10-11") }
  ]
})


// Queries

// Students enrolled in DBMS
db.students.find({ enrolledCourses: "DBMS" })

// Students with MongoDB skill
db.students.find({ skills: "MongoDB" })

// Students with a quiz score of at least 90
db.students.find({ recentActivities: { $elemMatch: { type: "quiz", score: { $gte: 90 } } } })

// Students whose DBMS attendance rate is at least 80% (computed in aggregation)
db.students.aggregate([
  { $unwind: "$attendance" },
  { $match: { "attendance.course": "DBMS" } },
  { $match: { $expr: { $gte: [
    { $divide: ["$attendance.present", "$attendance.total"] }, 0.8
  ] } } }
])

// Students with an assignment submitted recently (after a given date)
db.students.find({
  recentActivities: {
    $elemMatch: {
      type: "assignment", status: "submitted",
      at: { $gte: ISODate("2026-10-01") }
    }
  }
})



// 2. Event Logging System

// Design: Append one document per event. Use a timestamp and structured metadata; never store passwords or authentication secrets in logs.


db.eventLogs.insertMany([
  { userId: "u101", event: "login", at: ISODate("2026-10-13T09:00:00Z"), ip: "192.0.2.10" },
  { userId: "u101", event: "logout", at: ISODate("2026-10-13T09:30:00Z") },
  { userId: "u205", event: "failed-login", at: ISODate("2026-10-13T09:32:00Z"), ip: "192.0.2.50" },
  { userId: "u205", event: "failed-login", at: ISODate("2026-10-13T09:33:00Z"), ip: "192.0.2.50" },
  { userId: "u101", event: "file-upload", at: ISODate("2026-10-13T09:35:00Z"), fileType: "pdf" },
  { userId: "u101", event: "password-change", at: ISODate("2026-10-13T09:40:00Z") }
])



// Repeated failed logins by user (three or more)
db.eventLogs.aggregate([
  { $match: { event: "failed-login" } },
  { $group: { _id: "$userId", attempts: { $sum: 1 } } },
  { $match: { attempts: { $gte: 3 } } },
  { $sort: { attempts: -1 } }
])

// Repeated failed logins by IP
db.eventLogs.aggregate([
  { $match: { event: "failed-login" } },
  { $group: { _id: "$ip", attempts: { $sum: 1 } } },
  { $match: { attempts: { $gte: 3 } } }
])

// Frequency of each event type
db.eventLogs.aggregate([
  { $group: { _id: "$event", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// Events for one user, newest first
db.eventLogs.find({ userId: "u101" }).sort({ at: -1 })



// 3. Mini Blogging Platform

// Design: Embed comments for a small-to-medium comment count. For high-volume comments, use a separate comments collection.


db.blogs.insertOne({
  title: "Getting Started with MongoDB",
  author: { id: "a1", name: "Ravi" },
  category: "Technology",
  tags: ["mongodb", "database", "tutorial"],
  comments: [
    { user: "Meera", text: "Helpful article", at: ISODate("2026-10-12") }
  ],
  published: true,
  publishedAt: ISODate("2026-10-12")
})



// Category match
db.blogs.find({ category: "Technology", published: true })

// Any one of these tags
db.blogs.find({ tags: { $in: ["mongodb", "tutorial"] } })

// Must contain both tags
db.blogs.find({ tags: { $all: ["mongodb", "database"] } })

// Category AND at least one matching tag
db.blogs.find({
  category: "Technology",
  tags: { $in: ["mongodb", "cloud"] }
})

// Published after a date
db.blogs.find({ published: true, publishedAt: { $gte: ISODate("2026-01-01") } })



// 4. Flexible Product Catalog

// Design: Use a common `products` collection with a shared category field and category-specific attributes. This is a polymorphic document pattern.


db.products.insertMany([
  { name: "ThinkPad T14", category: "laptop", price: 1200,
    attributes: { ramGB: 16, storageGB: 512, processor: "Core i7" } },
  { name: "Pixel 9", category: "mobile", price: 799,
    attributes: { ramGB: 12, storageGB: 256, screenInches: 6.3, has5G: true } },
  { name: "EOS R10", category: "camera", price: 980,
    attributes: { sensorMP: 24, lensMount: "RF", video4K: true } }
])



// Laptops with at least 16 GB RAM
db.products.find({ category: "laptop", "attributes.ramGB": { $gte: 16 } })

// Mobiles supporting 5G
db.products.find({ category: "mobile", "attributes.has5G": true })

// Cameras that record 4K
db.products.find({ category: "camera", "attributes.video4K": true })

// Products in a price range
db.products.find({ price: { $gte: 500, $lte: 1000 } })



// 5. E-Commerce Order Management

// Design: Keep customers, products, and orders in separate collections. Store a product name and unit-price snapshot in each order item so historical totals remain correct if the catalog price changes.


db.customers.insertOne({ _id: "c1", name: "Nisha", email: "nisha@example.com" })
db.products.insertMany([
  { _id: "p1", name: "Keyboard", price: 45 },
  { _id: "p2", name: "Mouse", price: 20 }
])
db.orders.insertOne({
  _id: "o100", customerId: "c1", orderedAt: ISODate("2026-10-10"),
  status: "shipped",
  items: [
    { productId: "p1", name: "Keyboard", unitPrice: 45, quantity: 1 },
    { productId: "p2", name: "Mouse", unitPrice: 20, quantity: 2 }
  ],
  shipping: 5
})



// Customer's complete purchase history with calculated line and order totals
db.orders.aggregate([
  { $match: { customerId: "c1" } },
  { $unwind: "$items" },
  { $addFields: { "items.lineTotal": { $multiply: ["$items.unitPrice", "$items.quantity"] } } },
  { $group: {
    _id: "$_id", customerId: { $first: "$customerId" },
    orderedAt: { $first: "$orderedAt" }, status: { $first: "$status" },
    shipping: { $first: "$shipping" }, items: { $push: "$items" },
    subtotal: { $sum: "$items.lineTotal" }
  } },
  { $addFields: { total: { $add: ["$subtotal", { $ifNull: ["$shipping", 0] }] } } },
  { $sort: { orderedAt: -1 } }
])

// Simple order totals when no item-level output is needed
db.orders.aggregate([
  { $match: { customerId: "c1" } },
  { $project: {
    customerId: 1, orderedAt: 1,
    total: { $add: [
      { $sum: { $map: {
        input: "$items", as: "i",
        in: { $multiply: ["$$i.unitPrice", "$$i.quantity"] }
      } } },
      { $ifNull: ["$shipping", 0] }
    ] }
  } }
])



// 6. Website Analytics System

// Design: Record each page view as an event. Use UTC dates and avoid collecting unnecessary personal data.


db.pageVisits.insertMany([
  { page: "/home", userId: "u1", device: "mobile", browser: "Chrome", location: "Delhi", at: ISODate("2026-10-13T10:00:00Z") },
  { page: "/products", userId: "u2", device: "desktop", browser: "Firefox", location: "Pune", at: ISODate("2026-10-13T10:02:00Z") },
  { page: "/home", userId: "u3", device: "mobile", browser: "Chrome", location: "Delhi", at: ISODate("2026-10-13T10:04:00Z") }
])



// Most visited pages
db.pageVisits.aggregate([
  { $group: { _id: "$page", visits: { $sum: 1 } } },
  { $sort: { visits: -1 } },
  { $limit: 10 }
])

// Commonly used devices
db.pageVisits.aggregate([
  { $group: { _id: "$device", visits: { $sum: 1 } } },
  { $sort: { visits: -1 } }
])

// Browser usage
db.pageVisits.aggregate([
  { $group: { _id: "$browser", visits: { $sum: 1 } } },
  { $sort: { visits: -1 } }
])

// Visits during a date interval
db.pageVisits.find({
  at: { $gte: ISODate("2026-10-01"), $lt: ISODate("2026-11-01") }
})



// 7. Content Management System

// Design: Store editorial metadata and status on each article. A boolean `published` makes basic filtering straightforward.


db.articles.insertMany([
  { title: "MongoDB Indexes", authorId: "a1", category: "Technology",
    tags: ["mongodb", "performance"], status: "published",
    publishedAt: ISODate("2026-10-01") },
  { title: "Draft: Aggregation", authorId: "a2", category: "Education",
    tags: ["mongodb"], status: "draft", publishedAt: null }
])



// Published articles, newest first
db.articles.find({ status: "published" }).sort({ publishedAt: -1 })

// Unpublished/draft content
db.articles.find({ status: { $in: ["draft", "unpublished"] } })

// Published articles in a category with a tag
db.articles.find({
  status: "published", category: "Technology", tags: "mongodb"
})

// Articles by author
db.articles.find({ authorId: "a1" })

// Drafts updated recently (assuming updatedAt is maintained)
db.articles.find({
  status: "draft", updatedAt: { $gte: ISODate("2026-10-01") }
})



// 8. Embedded Shopping Cart

// Design: Embed cart items in the user's cart document for quick reads and atomic single-document updates.


db.carts.insertOne({
  _id: "user1",
  items: [
    { productId: "p1", name: "Notebook", unitPrice: 3, quantity: 2 }
  ]
})



// Add a new product (only if not already present)
db.carts.updateOne(
  { _id: "user1", "items.productId": { $ne: "p2" } },
  { $push: { items: { productId: "p2", name: "Pen", unitPrice: 1, quantity: 1 } } }
)

// Increase quantity if item exists
db.carts.updateOne(
  { _id: "user1", "items.productId": "p1" },
  { $inc: { "items.$.quantity": 1 } }
)

// Change quantity to a chosen value
db.carts.updateOne(
  { _id: "user1", "items.productId": "p1" },
  { $set: { "items.$.quantity": 5 } }
)

// Remove product
db.carts.updateOne(
  { _id: "user1" },
  { $pull: { items: { productId: "p2" } } }
)

// Calculate cart value
db.carts.aggregate([
  { $match: { _id: "user1" } },
  { $unwind: "$items" },
  { $group: {
    _id: "$_id",
    cartValue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } }
  } }
])

**Note:** The “add if absent” update above is safe for adding a new item, but if the item already exists the matched document is not updated; follow with the quantity update when implementing an upsert-like application workflow.


// 9. Product Review and Rating System

// Design: Store each review separately so reviews can grow independently. A unique compound index can prevent duplicate reviews per customer/product.


db.reviews.createIndex({ productId: 1, customerId: 1 }, { unique: true })
db.reviews.insertMany([
  { productId: "p1", customerId: "c1", rating: 5, text: "Excellent", at: ISODate("2026-10-01") },
  { productId: "p1", customerId: "c2", rating: 4, text: "Good", at: ISODate("2026-10-02") },
  { productId: "p2", customerId: "c1", rating: 3, text: "Average", at: ISODate("2026-10-03") }
])



// Average rating and review count per product
db.reviews.aggregate([
  { $group: {
    _id: "$productId",
    averageRating: { $avg: "$rating" },
    reviewCount: { $sum: 1 }
  } },
  { $sort: { averageRating: -1 } }
])

// Reviews for one product
db.reviews.find({ productId: "p1" }).sort({ at: -1 })



// 10. Inventory Monitoring System

// Design: Store available stock, reorder threshold, supplier, and restock date. Maintain `stock` from inventory movements rather than manual edits in production systems.


db.inventory.insertMany([
  { sku: "KB-01", name: "Keyboard", stock: 4, minStock: 10,
    supplier: { name: "ABC Supplies", phone: "000-000-0000" },
    lastRestockedAt: ISODate("2026-09-01") },
  { sku: "MN-02", name: "Monitor", stock: 30, minStock: 8,
    supplier: { name: "Display Hub" },
    lastRestockedAt: ISODate("2026-09-20") }
])



// Products at or below minimum stock
db.inventory.find({ $expr: { $lte: ["$stock", "$minStock"] } })

// Critical items with zero stock
db.inventory.find({ stock: { $lte: 0 } })

// Low stock, with supplier details
db.inventory.aggregate([
  { $match: { $expr: { $lte: ["$stock", "$minStock"] } } },
  { $project: { sku: 1, name: 1, stock: 1, minStock: 1, supplier: 1,
    shortage: { $subtract: ["$minStock", "$stock"] } } },
  { $sort: { shortage: -1 } }
])

// Items not restocked for 60 days (date cutoff supplied by application)
db.inventory.find({ lastRestockedAt: { $lt: ISODate("2026-08-14") } })



// 11. Bank Wallet Transfer with Transactions

// Design: MongoDB multi-document transactions require a replica set or sharded cluster. Use a session and transaction so debit and credit commit together or neither does. Validate amount and available balance; use a unique transfer ID for idempotency in a production design.


// Example wallet documents
db.wallets.insertMany([
  { _id: "u1", balance: 500 },
  { _id: "u2", balance: 100 }
])



// Run in mongosh connected to a replica set
const session = db.getMongo().startSession();
const walletDb = session.getDatabase("bank");
const amount = 50;

try {
  session.startTransaction();

  const debit = walletDb.wallets.updateOne(
    { _id: "u1", balance: { $gte: amount } },
    { $inc: { balance: -amount } }
  );
  if (debit.modifiedCount !== 1) {
    throw new Error("Wallet not found or insufficient funds");
  }

  const credit = walletDb.wallets.updateOne(
    { _id: "u2" },
    { $inc: { balance: amount } }
  );
  if (credit.modifiedCount !== 1) {
    throw new Error("Destination wallet not found");
  }

  walletDb.transfers.insertOne({
    from: "u1", to: "u2", amount,
    at: new Date(), status: "completed"
  });
  session.commitTransaction();
} catch (e) {
  session.abortTransaction();
  throw e;
} finally {
  session.endSession();
}

**Important:** Execute transaction operations through the session-bound database object as shown. Configure retry handling for transient transaction errors in production.


// 12. User Notification System

// Design: Each notification belongs to a user and includes a type, creation time, and read state.


db.notifications.insertMany([
  { userId: "u1", type: "message", title: "New message", body: "Hello",
    read: false, createdAt: ISODate("2026-10-13T10:00:00Z") },
  { userId: "u1", type: "order-update", title: "Order shipped",
    read: false, createdAt: ISODate("2026-10-13T10:05:00Z") },
  { userId: "u1", type: "system-alert", title: "Maintenance notice",
    read: true, createdAt: ISODate("2026-10-12T08:00:00Z") }
])



// Unread notifications
db.notifications.find({ userId: "u1", read: false }).sort({ createdAt: -1 })

// Unread notifications of selected types
db.notifications.find({
  userId: "u1", read: false, type: { $in: ["message", "order-update"] }
})

// Mark one notification as read
db.notifications.updateOne(
  { _id: ObjectId("000000000000000000000001"), userId: "u1" },
  { $set: { read: true, readAt: new Date() } }
)

// Mark all currently unread notifications as read
db.notifications.updateMany(
  { userId: "u1", read: false },
  { $set: { read: true, readAt: new Date() } }
)



// 13. Course Learning Platform

// Design: Keep course definitions and student enrollments separate. Store progress per enrolled student/course so progress queries remain direct.


db.courses.insertOne({
  _id: "course1", title: "MongoDB Basics", instructor: "Dr. Sen",
  modules: [
    { moduleId: "m1", title: "Documents" },
    { moduleId: "m2", title: "Queries" },
    { moduleId: "m3", title: "Aggregation" }
  ]
})
db.enrollments.insertMany([
  { studentId: "s1", courseId: "course1", progress: 100, completed: true, completedAt: ISODate("2026-10-10") },
  { studentId: "s2", courseId: "course1", progress: 45, completed: false },
  { studentId: "s3", courseId: "course1", progress: 10, completed: false }
])



// Students with at least 75% progress
db.enrollments.find({ courseId: "course1", progress: { $gte: 75 } })

// Incomplete enrollments
db.enrollments.find({ courseId: "course1", completed: false })

// Completed students, most recent completion first
db.enrollments.find({ courseId: "course1", completed: true }).sort({ completedAt: -1 })

// Progress bands
db.enrollments.aggregate([
  { $match: { courseId: "course1" } },
  { $bucket: {
    groupBy: "$progress",
    boundaries: [0, 25, 50, 75, 101],
    default: "unknown",
    output: { students: { $sum: 1 } }
  } }
])



// 14. Real-Time Order Tracking

// Design: Keep current status for fast access and append every transition to `statusHistory`. In production, update both fields atomically in one document.


db.ordersTracking.insertOne({
  _id: "ord-900",
  customerId: "c1",
  currentStatus: "Placed",
  statusHistory: [
    { status: "Placed", at: ISODate("2026-10-13T08:00:00Z"), note: "Order received" }
  ]
})



// Move order to Confirmed and append history in one atomic document update
db.ordersTracking.updateOne(
  { _id: "ord-900", currentStatus: "Placed" },
  {
    $set: { currentStatus: "Confirmed" },
    $push: { statusHistory: {
      status: "Confirmed", at: new Date(), note: "Payment verified"
    } }
  }
)

// Retrieve current status
db.ordersTracking.findOne(
  { _id: "ord-900" },
  { _id: 1, currentStatus: 1 }
)

// Retrieve complete status timeline
db.ordersTracking.findOne(
  { _id: "ord-900" },
  { _id: 1, currentStatus: 1, statusHistory: 1 }
)

// Find all shipped orders
db.ordersTracking.find({ currentStatus: "Shipped" })



// 15. Flexible News Database

// Design: A flexible schema allows optional fields to differ between articles. Keep common searchable fields consistent where possible, and use `$exists` or `$type` for optional properties.


db.news.insertMany([
  {
    title: "City opens new library", category: "Local", author: "Anita",
    location: { city: "Jaipur", country: "India" },
    tags: ["education", "city"], images: ["library.jpg"],
    sources: ["City Council"], publishedAt: ISODate("2026-10-12")
  },
  {
    title: "New camera sensor announced", category: "Technology",
    tags: ["camera", "technology"], sources: [{ name: "Tech Desk", url: "https://example.com" }],
    publishedAt: ISODate("2026-10-13")
  },
  {
    title: "Regional weather alert", category: "Local",
    location: { city: "Dehradun" }, author: "News Desk",
    publishedAt: ISODate("2026-10-13")
  }
])



// Search common category field
db.news.find({ category: "Local" })

// Search a tag when tags are present
db.news.find({ tags: "technology" })

// Articles with an author field, regardless of other missing fields
db.news.find({ author: { $exists: true } })

// Articles that have an image array
db.news.find({ images: { $exists: true, $type: "array" } })

// Articles for a particular city
db.news.find({ "location.city": "Dehradun" })

// Flexible text search across selected fields (create index first)
db.news.createIndex({ title: "text", author: "text", category: "text", tags: "text" })
db.news.find({ $text: { $search: "camera technology" } })

// News matching category OR city, even when other fields are absent
db.news.find({
  $or: [{ category: "Local" }, { "location.city": "Jaipur" }]
})

