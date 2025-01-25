import React from 'react';
import AppointmentScreen from '../appointment/Appointments'; // Reuse the AppointmentScreen component

const CreateAppointment = (props) => {
  return <AppointmentScreen {...props} />;
};

export default CreateAppointment; 