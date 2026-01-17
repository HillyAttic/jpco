export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  taskCount: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  isActive?: boolean;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string;
}
