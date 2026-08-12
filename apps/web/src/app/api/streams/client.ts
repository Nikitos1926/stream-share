import { Stream } from '@stream-share/db';
import toast from 'react-hot-toast';

export const createStream = async (isPrivate = false) => {
  let response;
  try {
    response = await fetch('http://localhost:4000/streams', {
      method: 'post',
      credentials: 'include',
      body: JSON.stringify({ isPrivate }),
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.log(error);
    toast.error('Something went wrong');
    return;
  }
  if (!response.ok) {
    toast.error('Cannot create stream. Try again later');
    return;
  }
  try {
    const { data } = (await response.json()) as { data: Stream };
    return data;
  } catch (error) {
    console.log(error);
    toast.error('Something went wrong');
  }
};

export const uploadThumbnail = async (streamId: string, image: Blob) => {
  let response;
  try {
    response = await fetch(`http://localhost:4000/streams/${streamId}/thumbnail`, {
      method: 'post',
      credentials: 'include',
      body: image,
      headers: { 'content-type': 'application/octet-stream' },
    });
  } catch (error) {
    console.log(error);
    toast.error('Something went wrong');
    return;
  }
  if (!response.ok) {
    toast.error('Cannot upload stream thumbnail');
    return;
  }
  try {
    const { data } = (await response.json()) as { data: Stream };
    return data;
  } catch (error) {
    console.log(error);
    toast.error('Something went wrong');
  }
};
