
export const createMockClient = () => {
  const getStorage = (key: string) => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  };

  const setStorage = (key: string, data: any[]) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  class MockQueryBuilder {
    table: string;
    filters: ((item: any) => boolean)[];
    sorts: ((a: any, b: any) => number)[];
    limitVal: number;
    data: any[];
    error: any;

    constructor(table: string) {
      this.table = table;
      this.filters = [];
      this.sorts = [];
      this.limitVal = -1;
      this.data = [];
      this.error = null;
    }

    select(columns: string = '*') {
      return this;
    }

    eq(column: string, value: any) {
      this.filters.push((item) => item[column] == value);
      return this;
    }

    neq(column: string, value: any) {
      this.filters.push((item) => item[column] != value);
      return this;
    }

    gt(column: string, value: any) {
      this.filters.push((item) => item[column] > value);
      return this;
    }

    lt(column: string, value: any) {
      this.filters.push((item) => item[column] < value);
      return this;
    }

    gte(column: string, value: any) {
      this.filters.push((item) => item[column] >= value);
      return this;
    }

    lte(column: string, value: any) {
      this.filters.push((item) => item[column] <= value);
      return this;
    }

    like(column: string, pattern: string) {
      const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
      this.filters.push((item) => regex.test(item[column]));
      return this;
    }

    ilike(column: string, pattern: string) {
      const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
      this.filters.push((item) => regex.test(item[column]));
      return this;
    }

    is(column: string, value: any) {
      this.filters.push((item) => item[column] === value);
      return this;
    }

    in(column: string, values: any[]) {
      this.filters.push((item) => values.includes(item[column]));
      return this;
    }

    contains(column: string, value: any) {
      this.filters.push((item) => Array.isArray(item[column]) && item[column].includes(value));
      return this;
    }

    order(column: string, { ascending = true } = {}) {
      this.sorts.push((a, b) => {
        if (a[column] < b[column]) return ascending ? -1 : 1;
        if (a[column] > b[column]) return ascending ? 1 : -1;
        return 0;
      });
      return this;
    }

    limit(count: number) {
      this.limitVal = count;
      return this;
    }

    range(from: number, to: number) {
      return this;
    }

    single() {
      return this.then((res: any) => ({ data: res.data?.[0] || null, error: res.error }));
    }

    maybeSingle() {
      return this.then((res: any) => ({ data: res.data?.[0] || null, error: res.error }));
    }

    or(filter: string) {
      this.filters.push((item) => {
        const conditions = filter.split(',');
        return conditions.some(cond => {
          // Handle simple cases like `col.eq.val` or `col.ilike.val`
          // This is a very basic parser and won't handle complex nested logic
          const parts = cond.split('.');
          if (parts.length >= 3) {
             const col = parts[0];
             const op = parts[1];
             const val = parts.slice(2).join('.'); // Rejoin in case value had dots
             
             if (op === 'ilike') {
               const pattern = val.replace(/%/g, '');
               return new RegExp(pattern, 'i').test(item[col]);
             }
             if (op === 'eq') {
               return item[col] == val;
             }
          }
          return false;
        });
      });
      return this;
    }

    async insert(rows: any[]) {
      const currentData = getStorage(this.table);
      const newRows = rows.map(row => ({ 
        ...row, 
        id: row.id || Math.random().toString(36).substr(2, 9), 
        created_at: new Date().toISOString() 
      }));
      setStorage(this.table, [...currentData, ...newRows]);
      this.data = newRows;
      return this;
    }

    async upsert(rows: any[] | any, { onConflict }: { onConflict?: string } = {}) {
      let currentData = getStorage(this.table);
      const rowsArray = Array.isArray(rows) ? rows : [rows];
      
      const newRows = rowsArray.map(row => ({ 
        ...row, 
        id: row.id || Math.random().toString(36).substr(2, 9), 
        created_at: new Date().toISOString() 
      }));
      
      if (onConflict) {
        const conflictKeys = onConflict.split(',');
        newRows.forEach(newRow => {
          const index = currentData.findIndex((existing: any) => 
            conflictKeys.every(key => existing[key] == newRow[key])
          );
          if (index >= 0) {
            currentData[index] = { ...currentData[index], ...newRow };
          } else {
            currentData.push(newRow);
          }
        });
      } else {
         newRows.forEach(newRow => {
          const index = currentData.findIndex((existing: any) => existing.id === newRow.id);
          if (index >= 0) {
            currentData[index] = { ...currentData[index], ...newRow };
          } else {
            currentData.push(newRow);
          }
        });
      }
      
      setStorage(this.table, currentData);
      this.data = newRows;
      return this;
    }

    update(updates: any) {
      // For update, we need to defer execution until filters are applied
      // But in this simple mock, we can't easily do that if we return `this` directly
      // because `then` will be called later.
      // We'll store the updates and apply them in `then`.
      (this as any)._updates = updates;
      return this;
    }

    async delete() {
      (this as any)._isDelete = true;
      return this;
    }

    then(resolve: (result: { data: any, error: any }) => void, reject?: (err: any) => void) {
      // If we already have data (from insert/upsert), return it
      if (this.data.length > 0 && !(this as any)._updates && !(this as any)._isDelete) {
        resolve({ data: this.data, error: null });
        return Promise.resolve({ data: this.data, error: null });
      }

      let result = getStorage(this.table);

      // Apply filters
      for (const filter of this.filters) {
        result = result.filter(filter);
      }

      // Apply updates
      if ((this as any)._updates) {
        const allData = getStorage(this.table);
        const updates = (this as any)._updates;
        const updatedIds = result.map((r: any) => r.id);
        
        const newData = allData.map((item: any) => {
          if (updatedIds.includes(item.id)) {
            return { ...item, ...updates };
          }
          return item;
        });
        setStorage(this.table, newData);
        result = result.map((item: any) => ({ ...item, ...updates }));
      }

      // Apply delete
      if ((this as any)._isDelete) {
        const allData = getStorage(this.table);
        const deletedIds = result.map((r: any) => r.id);
        const newData = allData.filter((item: any) => !deletedIds.includes(item.id));
        setStorage(this.table, newData);
        result = []; // Return empty or the deleted rows? Supabase returns deleted rows if .select() is used.
      }

      // Apply sorts
      for (const sort of this.sorts) {
        result.sort(sort);
      }

      // Apply limit
      if (this.limitVal > 0) {
        result = result.slice(0, this.limitVal);
      }

      const response = { data: result, error: null };
      resolve(response);
      return Promise.resolve(response);
    }
  }

  return {
    from: (table: string) => new MockQueryBuilder(table),
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: File) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 300; // Resize to max 300px to save space and time
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                  if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                  }
                } else {
                  if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                  }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL(file.type || 'image/jpeg', 0.8);
                
                try {
                  const key = `mock_storage_${bucket}_${path}`;
                  localStorage.setItem(key, dataUrl);
                } catch (err) {
                  console.warn('Mock storage quota exceeded', err);
                }
                resolve({ data: { path }, error: null });
              };
              img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
          });
        },
        getPublicUrl: (path: string) => {
          const key = `mock_storage_${bucket}_${path}`;
          const storedUrl = localStorage.getItem(key);
          // Use stored URL or a faster placeholder
          return { data: { publicUrl: storedUrl || 'https://placehold.co/200x200?text=No+Image' } };
        }
      })
    }
  };
};
