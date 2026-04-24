import api from './api';

export const savedViewsService = {
  create: (data: any) =>
    api.post('/saved-views', data).then((r) => r.data),

  getAll: (module?: string) =>
    api.get('/saved-views', { params: module ? { module } : {} }).then((r) => r.data),

  getOne: (id: string) =>
    api.get(`/saved-views/${id}`).then((r) => r.data),

  update: (id: string, data: any) =>
    api.patch(`/saved-views/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/saved-views/${id}`),

  clone: (id: string) =>
    api.post(`/saved-views/${id}/clone`).then((r) => r.data),

  share: (id: string, data: { userId: string; canEdit?: boolean }) =>
    api.post(`/saved-views/${id}/share`, data).then((r) => r.data),

  unshare: (id: string, userId: string) =>
    api.delete(`/saved-views/${id}/share/${userId}`),
};
