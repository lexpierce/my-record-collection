package db

import (
	"testing"
)

func TestConnectInvalidURL(t *testing.T) {
	_, err := Connect("not-a-valid-postgres-url")
	if err == nil {
		t.Fatal("Connect with invalid URL should return error")
	}
}
