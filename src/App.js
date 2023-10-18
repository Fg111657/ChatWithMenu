import React from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material-next/Button';


export default function App(props) {
  const [name, setName ]= React.useState("Felix")





  return (
    <div className='App'>
      <h1>Hello {name}.</h1>
      <h2>Start editing to see some magic happen!</h2>
      <TextField value= {name} onChange={(event) => {
    setName(event.target.value);
  }} />
  <Button>Food Allergies       </Button>
  <Button> Diet </Button>
    </div>
  );
}

// Log to console
console.log('')