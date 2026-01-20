/**
 * Script to seed initial employees in Firestore
 * Run this script to populate the employees collection with sample data
 */

import { employeeService } from '@/services/employee.service';
import { Employee } from '@/services/employee.service';

const sampleEmployees: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    employeeId: 'EMP001',
    name: 'John Smith',
    email: 'john.smith@company.com',
    phone: '+1-555-0101',
    position: 'Senior Software Engineer',
    department: 'Engineering',
    hireDate: new Date('2022-01-15'),
    avatarUrl: undefined,
    status: 'active',
    managerId: undefined,
    teamIds: [],
  },
  {
    employeeId: 'EMP002',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    phone: '+1-555-0102',
    position: 'Product Manager',
    department: 'Product',
    hireDate: new Date('2021-03-22'),
    avatarUrl: undefined,
    status: 'active',
    managerId: undefined,
    teamIds: [],
  },
  {
    employeeId: 'EMP003',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    phone: '+1-555-0103',
    position: 'UI/UX Designer',
    department: 'Design',
    hireDate: new Date('2022-07-10'),
    avatarUrl: undefined,
    status: 'active',
    managerId: undefined,
    teamIds: [],
  },
  {
    employeeId: 'EMP004',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@company.com',
    phone: '+1-555-0104',
    position: 'Frontend Developer',
    department: 'Engineering',
    hireDate: new Date('2023-02-01'),
    avatarUrl: undefined,
    status: 'active',
    managerId: undefined,
    teamIds: [],
  },
  {
    employeeId: 'EMP005',
    name: 'David Wilson',
    email: 'david.wilson@company.com',
    phone: '+1-555-0105',
    position: 'Backend Developer',
    department: 'Engineering',
    hireDate: new Date('2021-11-08'),
    avatarUrl: undefined,
    status: 'active',
    managerId: undefined,
    teamIds: [],
  },
  {
    employeeId: 'EMP006',
    name: 'Lisa Anderson',
    email: 'lisa.anderson@company.com',
    phone: '+1-555-0106',
    position: 'QA Engineer',
    department: 'Engineering',
    hireDate: new Date('2022-09-12'),
    avatarUrl: undefined,
    status: 'active',
    managerId: undefined,
    teamIds: [],
  },
  {
    employeeId: 'EMP007',
    name: 'Robert Taylor',
    email: 'robert.taylor@company.com',
    phone: '+1-555-0107',
    position: 'DevOps Engineer',
    department: 'Engineering',
    hireDate: new Date('2020-05-18'),
    avatarUrl: undefined,
    status: 'active',
    managerId: undefined,
    teamIds: [],
  },
  {
    employeeId: 'EMP008',
    name: 'Jennifer Martinez',
    email: 'jennifer.martinez@company.com',
    phone: '+1-555-0108',
    position: 'Marketing Specialist',
    department: 'Marketing',
    hireDate: new Date('2021-08-30'),
    avatarUrl: undefined,
    status: 'active',
    managerId: undefined,
    teamIds: [],
  },
];

/**
 * Seed initial employees in Firestore
 */
export async function seedEmployees() {
  try {
    console.log('Starting employee seeding...');
    
    // Check if employees already exist
    const existingEmployees = await employeeService.getAll();
    
    if (existingEmployees.length > 0) {
      console.log(`Found ${existingEmployees.length} existing employees. Skipping seed.`);
      return {
        message: `Found ${existingEmployees.length} existing employees. Skipping seed.`,
        existingCount: existingEmployees.length,
        employees: existingEmployees,
      };
    }

    // Create sample employees
    const createdEmployees = [];
    const errors = [];

    for (const employeeData of sampleEmployees) {
      try {
        const employee = await employeeService.create(employeeData);
        createdEmployees.push(employee);
        console.log(`✓ Created employee: ${employee.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          employee: employeeData.name,
          error: errorMessage,
        });
        console.error(`✗ Failed to create ${employeeData.name}: ${errorMessage}`);
      }
    }

    console.log(`Seeding complete! Created ${createdEmployees.length} employees.`);
    
    if (errors.length > 0) {
      console.log(`Encountered ${errors.length} errors:`);
      errors.forEach(err => console.log(`  - ${err.employee}: ${err.error}`));
    }

    return {
      message: `Successfully seeded ${createdEmployees.length} employees`,
      createdCount: createdEmployees.length,
      errors: errors,
      employees: createdEmployees,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error seeding employees:', errorMessage);
    throw error;
  }
}

// Run the seeding function if this file is executed directly
if (require.main === module) {
  seedEmployees()
    .then(result => {
      console.log('Seeding result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}