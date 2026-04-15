// DishViewer.js
import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

import dataService from '../../services/dataService';


const DishViewer = ({ dishes, restaurantId }) => {
    const [images, setImages] = useState([]);

    useEffect(() => {
        const fetchImages = async () => {
            setImages([])
            for (let i = 0; i < dishes.length; i++) {
                console.log('Index', i, dishes[i])
                let dish = dishes[i];
                let imageUrl;
                try {
                    imageUrl = await dataService.genImageDish(restaurantId, dish);
                } catch {
                    imageUrl = null;
                }
                // Update state with each new image
                console.log('Pushing', 42069)
                setImages((imgs) => [...imgs, imageUrl]);
            }
        };
        fetchImages();
    }, [dishes, restaurantId]);

    return (
        <Box sx={{ display: 'flex', overflowX: 'auto', p: 2 }}>
            {dishes.map((dish, index) => {
                const hasImage = images.length > index && images[index] && images[index]['img_base64'];

                if (!hasImage && images.length <= index) {
                    // Still loading
                    return <CircularProgress key={index} />;
                }

                if (!hasImage) {
                    // Image generation disabled or failed - don't show anything
                    return null;
                }

                return (
                    <Box key={index} sx={{ textAlign: 'center', mr: 2 }}>
                        <img
                            src={images[index]['img_base64']}
                            alt={dish}
                            style={{
                                width: '100%',
                                minWidth: 150,
                                height: 'auto'
                            }}
                        />
                        <Typography variant="caption">{dish}</Typography>
                    </Box>
                );
            })}
        </Box>
    );
};

export default DishViewer;
