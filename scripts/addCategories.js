require('dotenv').config({ path: '.env' });
const { MongoClient } = require('mongodb');

const uri = process.env.NODE_ENV === 'development' 
  ? process.env.MONGODB_URI_COPY 
  : process.env.MONGODB_URI;

if (!uri) {
  console.error('Please add your Mongo URI to .env.local');
  process.exit(1);
}

const sampleCategories = [
  {
    _id: "CAT001",
    category: "Plants",
    typeOfCategory: "Product",
    l1Parent: "Nature",
    l2Parent: "Living",
    l3Parent: "Green",
    publish: true,
    priorityOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "CAT002", 
    category: "Indoor Plants",
    typeOfCategory: "Product",
    l1Parent: "Plants",
    l2Parent: "Indoor",
    l3Parent: "Decorative",
    publish: true,
    priorityOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "CAT003",
    category: "Pots",
    typeOfCategory: "Product", 
    l1Parent: "Accessories",
    l2Parent: "Plant Care",
    l3Parent: "Containers",
    publish: true,
    priorityOrder: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "CAT004",
    category: "Home Décor",
    typeOfCategory: "Product",
    l1Parent: "Interior",
    l2Parent: "Decorative",
    l3Parent: "Accessories",
    publish: true,
    priorityOrder: 4,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "CAT005",
    category: "Garden Tools",
    typeOfCategory: "Product",
    l1Parent: "Tools",
    l2Parent: "Garden",
    l3Parent: "Equipment",
    publish: false, // This one is not published
    priorityOrder: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function addCategories() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('GrowthAutomation');
    const collection = db.collection('categoryList');
    
    // Check if categories already exist
    const existingCount = await collection.countDocuments();
    console.log(`Found ${existingCount} existing categories`);
    
    if (existingCount > 0) {
      console.log('Categories already exist. Skipping insertion.');
      return;
    }
    
    // Insert sample categories
    const result = await collection.insertMany(sampleCategories);
    console.log(`Inserted ${result.insertedCount} categories`);
    
    // Verify insertion
    const publishedCategories = await collection.find({ publish: true }).sort({ priorityOrder: 1 }).toArray();
    console.log(`Found ${publishedCategories.length} published categories:`);
    publishedCategories.forEach(cat => {
      console.log(`- ${cat.category} (Priority: ${cat.priorityOrder})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

addCategories();
