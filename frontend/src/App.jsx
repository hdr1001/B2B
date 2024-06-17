import { useState } from 'react';
import { 
  AppBar,
  Toolbar,
  Typography,
  Button
} from '@mui/material';
import { styled } from '@mui/material/styles';

const Offset = styled('div')(({ theme }) => theme.mixins.toolbar);

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <AppBar>
          <Toolbar>
            <Typography align="left" sx={{ flexGrow: 1 }}>B2B API Hub</Typography>
          </Toolbar>
        </AppBar>
        <Offset />
        <Button variant="contained" onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </Button>
      </div>
    </>
  )
}

export default App
