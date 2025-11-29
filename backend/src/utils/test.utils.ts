import 'dotenv/config';
import { getCoordinates } from './geocoding.utils';

(async () => {
  const location = await getCoordinates('Stockholm');
  console.log('location:', location);
})();
