<?php

test('the application returns a successful response', function () {
    // No built frontend is needed to render the page shell (public/build is not committed)
    $response = $this->withoutVite()->get('/');

    $response->assertStatus(200);
});
