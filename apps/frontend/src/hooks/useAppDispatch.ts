import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../app/store';

/** Typed dispatch hook – use instead of plain useDispatch */
export const useAppDispatch = () => useDispatch<AppDispatch>();
