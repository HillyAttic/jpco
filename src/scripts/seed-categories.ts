/**
 * Script to seed initial categories in Firestore
 * Run this script to populate the categories collection with sample data
 */

import { categoryService } from '@/services/category.service';
import { CreateCategoryInput } from '@/types/category.types';

const initialCategories: CreateCategoryInput[] = [
  {
    name: 'Development',
    description: 'Software development and coding tasks',
    color: '#3B82F6',
    icon: '💻',
    isActive: true,
  },
  {
    name: 'Design',
    description: 'UI/UX design and creative work',
    color: '#EC4899',
    icon: '🎨',
    isActive: true,
  },
  {
    name: 'Marketing',
    description: 'Marketing campaigns and promotions',
    color: '#F59E0B',
    icon: '📢',
    isActive: true,
  },
  {
    name: 'Research',
    description: 'Research and analysis tasks',
    color: '#8B5CF6',
    icon: '🔬',
    isActive: true,
  },
  {
    name: 'Documentation',
    description: 'Writing and maintaining documentation',
    color: '#10B981',
    icon: '📚',
    isActive: true,
  },
  {
    name: 'Testing',
    description: 'Quality assurance and testing tasks',
    color: '#EF4444',
    icon: '🧪',
    isActive: true,
  },
  {
    name: 'Planning',
    description: 'Project planning and strategy',
    color: '#F97316',
    icon: '📋',
    isActive: true,
  },
  {
    name: 'Support',
    description: 'Customer support and maintenance',
    color: '#06B6D4',
    icon: '🛠️',
    isActive: true,
  },
];

export async function seedCategories() {
  console.log('🌱 Starting to seed categories...');
  
  try {
    // Check if categories already exist
    const existingCategories = await categoryService.getAll();
    
    if (existingCategories.length > 0) {
      console.log(`📦 Found ${existingCategories.length} existing categories. Skipping seed.`);
      return;
    }

    // Create initial categories
    const createdCategories = [];
    for (const categoryData of initialCategories) {
      try {
        const category = await categoryService.create(categoryData);
        createdCategories.push(category);
        console.log(`✅ Created category: ${category.name}`);
      } catch (error) {
        console.error(`❌ Failed to create category ${categoryData.name}:`, error);
      }
    }

    console.log(`🎉 Successfully seeded ${createdCategories.length} categories!`);
    return createdCategories;
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  }
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  seedCategories()
    .then(() => {
      console.log('✨ Category seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Category seeding failed:', error);
      process.exit(1);
    });
}