import { useState } from 'react';
import { 
  AppBar,
  Toolbar,
  Typography,
  Tooltip,
  IconButton,
  Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SettingsIcon from '@mui/icons-material/Settings';

const Offset = styled('div')(({ theme }) => theme.mixins.toolbar);

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <AppBar>
          <Toolbar>
            <Typography align="left" sx={{ flexGrow: 1 }}>B2B API Hub</Typography>
            <Tooltip title='Settings'>
               <IconButton
                  color='inherit'
               >
                  <SettingsIcon />
               </IconButton>
            </Tooltip>
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
