import { createContext, useContext } from 'react';
import useFetch from './useFetch';

const Ctx = createContext({ categories: [], reload: () => {} });
export const useCategories = () => useContext(Ctx);

export function CategoriesProvider({ children }) {
  const { data, reload } = useFetch('/categories');
  return <Ctx.Provider value={{ categories: data?.categories || [], reload }}>{children}</Ctx.Provider>;
}
